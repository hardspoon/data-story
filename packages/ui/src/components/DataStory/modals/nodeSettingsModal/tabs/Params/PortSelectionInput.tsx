import { Param } from '@data-story/core'
import { useFormContext, useWatch } from 'react-hook-form';
import { useMemo } from 'react';
import { FormComponent, FormComponentProps } from '../../../../types';

export function PortSelectionInput({
  param,
  name,
  node,
}: FormComponentProps) {
  const { register,  control } = useFormContext()
  const outputsDraft = useWatch({
    control: control,
    name: 'outputs',
    exact: true,
  });
  const parsedOutputs = useMemo(() => JSON.parse(outputsDraft), [outputsDraft]);

  return (<div
    data-cy={'data-story-port-selection-input'}
    className="group flex flex-col bg-gray-50"
  >
    <div className="flex justify-between">
      <select
        key={'port'}
        className="bg-gray-50 px-2 py-1"
        {...register(name!)}
      >
        {parsedOutputs.map(output => (
          <option
            key={ output?.id ?? output.name}
            value={output.name}
          >{output.name}</option>
        ))}
      </select>
    </div>
  </div>)
}

export class PortSelectionComponent implements FormComponent<Param> {
  getComponent(params: FormComponentProps & {param: Param}) {
    return (<PortSelectionInput {...params} />);
  };

  getType() {
    return 'PortSelectionParam';
  }
}
